#!/usr/bin/env python3
"""
Convert music.me library from JSON to JavaScript format
Transforms source/library.json to content/library.js with proper data structure
"""

import json
import os
from typing import Any, Dict, List


def convert_json_to_js(input_file: str, output_file: str) -> None:
    """
    Convert JSON library file to JavaScript format
    
    Args:
        input_file: Path to source JSON file
        output_file: Path to output JS file
    """
    
    # Read the JSON file
    with open(input_file, 'r', encoding='utf-8') as f:
        json_data = json.load(f)
    
    # Transform the data structure
    js_catalogue = transform_artists(json_data)
    
    # Write the JavaScript file
    write_js_file(output_file, js_catalogue)
    print(f"✓ Successfully converted {input_file} to {output_file}")


def transform_artists(artists: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Transform artist data from JSON structure to JS structure
    
    Args:
        artists: List of artist objects from JSON
        
    Returns:
        Transformed list of artist objects for JS
    """
    
    js_artists = []
    
    for artist in artists:
        js_artist = {
            "artist": artist.get("artist", "Unknown Artist"),
            "id": artist.get("id", 0),
            "genre": artist.get("genre", "Unknown"),
            "albums": transform_albums(artist.get("albums", [])),
            "portrait": artist.get("portrait", ""),
            "similar": artist.get("similar", [])
        }
        js_artists.append(js_artist)
    
    return js_artists


def transform_albums(albums: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Transform album data from JSON structure to JS structure
    
    Args:
        albums: List of album objects from JSON
        
    Returns:
        Transformed list of album objects for JS
    """
    
    js_albums = []
    
    for album in albums:
        js_album = {
            "album": album.get("album", "Unknown Album"),
            "id": album.get("id", 0),
            "year": album.get("year", "2024"),
            "songs": transform_songs(album.get("songs", [])),
            "artwork": album.get("coverUrl", ""),
            "sold": album.get("sold", "")
        }
        js_albums.append(js_album)
    
    return js_albums


def transform_songs(songs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Transform song data from JSON structure to JS structure
    
    Args:
        songs: List of song objects from JSON
        
    Returns:
        Transformed list of song objects for JS
    """
    
    js_songs = []
    
    for song in songs:
        # Extract artist_id and album_id from downloadPath or use placeholders
        download_path = song.get("downloadPath", "")
        artist_id = extract_id_from_path(download_path, 1) or "ARTIST_ID"
        album_id = extract_id_from_path(download_path, 2) or "ALBUM_ID"
        song_id = song.get("id", "SONG_ID")
        
        # Build the source URL in the desired format
        title = song.get("title", "Unknown")
        encoded_title = title.replace(" ", "%20").replace("(", "%28").replace(")", "%29").replace("&", "%26").replace("?", "%3F").replace("'", "%27")
        
        source_url = f"https://clockblocked.github.io/music.me/content/audio/{artist_id}/{album_id}/{song_id}?title={encoded_title}"
        
        js_song = {
            "id": song_id,
            "title": title,
            "source": source_url,
            "duration": song.get("duration", "0:00"),
            "explicit": song.get("explicit", False),
            "video": song.get("video", ""),
            "trackNumber": song.get("trackNumber", 0)
        }
        js_songs.append(js_song)
    
    return js_songs


def extract_id_from_path(path: str, position: int) -> str:
    """
    Extract ID from download path
    
    Args:
        path: The download path URL
        position: Which segment to extract (1=artist_id, 2=album_id)
        
    Returns:
        The extracted ID or empty string if not found
    """
    
    try:
        # Path format: /api/song/ARTIST_ID/ALBUM_ID/SONG_ID?title=...
        parts = path.split('/')
        
        # Find the 'song' part and extract from there
        if 'song' in parts:
            song_index = parts.index('song')
            if position == 1 and song_index + 1 < len(parts):
                return parts[song_index + 1]
            elif position == 2 and song_index + 2 < len(parts):
                return parts[song_index + 2]
    except (ValueError, IndexError):
        pass
    
    return ""


def write_js_file(output_file: str, catalogue: List[Dict[str, Any]]) -> None:
    """
    Write JavaScript file with proper formatting
    
    Args:
        output_file: Path to output JS file
        catalogue: The catalogue data to write
    """
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        # Write header comment
        f.write("/**\n")
        f.write("* Music Library Catalogue\n")
        f.write("* Auto-generated from source/library.json\n")
        f.write("*\n")
        f.write("* [1]\n")
        f.write("* song.source URL =\"https://clockblocked.github.io/music.me/content/audio/\"\n")
        f.write("* \".../ARTIST_ID/ALBUM_ID/SONG_ID?title=SONG_TITLE\" + \".webm || .mp3\"\n")
        f.write("*\n")
        f.write("* [2]\n")
        f.write("* video = YouTube Video ID --- Found in the video's URL\n")
        f.write("*\n")
        f.write("*/\n")
        
        # Write window.catalogue assignment
        f.write("window.catalogue = ")
        
        # Convert to JSON and write with custom formatting
        json_str = json.dumps(catalogue, ensure_ascii=False, indent=2)
        f.write(json_str)
        f.write(";\n")


def main():
    """Main entry point"""
    
    input_file = "source/library.json"
    output_file = "content/library.js"
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"✗ Error: Input file '{input_file}' not found")
        print(f"  Please ensure you're running this script from the repository root")
        return
    
    try:
        convert_json_to_js(input_file, output_file)
        print(f"✓ Conversion complete!")
        print(f"  Output file: {output_file}")
    except Exception as e:
        print(f"✗ Error during conversion: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
