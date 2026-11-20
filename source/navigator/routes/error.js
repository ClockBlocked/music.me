// /////////////////////////////////////////////////
// Error 404 Page
// /////////////////////////////////////////////////
class Error404 {
  constructor(ui) {
    this.ui = ui;
  }

  render() {
    return `
      <div data-page="404" class="page animate-fadeInUp">
        <div class="wrap">
          <div class="code">404</div>
          <h1 class="title">Page Not Found</h1>
          <p class="desc">The page you're looking for doesn't exist or may have been moved.</p>
          <div class="actions">
            <button onclick="window.pagesActions.goHome()" class="home">🏠 Take me Home</button>
            <button onclick="window.history.back()" class="back">↩ Go Back</button>
          </div>
          <div class="note"><p>Error 404 - The requested resource could not be found.</p></div>
        </div>
      </div>
    `;
  }
}

window.Error404 = Error404;
