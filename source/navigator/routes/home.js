// Home page class. Route methods are installed by the accompanying home modules.
// Keep module scripts ordered before builder/player initialization code runs.
class Home {
  constructor(ui) {
    this.ui = ui;
    this.recentLimit = 15;
    this.mostPlayedLimit = 3;
    this.discoverArtistLimit = 5;
    this.discoverSongsPerArtist = 3;
    this.genreLimit = 14;
    this.discoverIndex = 0;
    this.discoverCache = null;
    this.focusedGenre = null;
    this.bindLiveUpdates();
  }
}

window.Home = Home;
