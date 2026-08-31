# Shelf for Obsidian

**Shelf** is a powerful, visually stunning media library plugin for Obsidian. It brings a sleek interface directly into your vault, allowing you to track, manage, and sync metadata for your Movies, TV Shows, Games, and Books.

## ✨ Features

- **All-in-One Media Tracking:** Track Movies, TV Shows, Games, and Books in a single, unified interface.
- **Automatic Metadata Syncing:** Instantly fetch cover art, release dates, genres, studios, authors, and summaries from official databases:
  - **Movies & TV Shows** via [TMDB](https://www.themoviedb.org/)
  - **Video Games** via [IGDB](https://www.igdb.com/)
  - **Books** via [Google Books](https://books.google.com/)
- **Custom Markdown Templates:** You have full control over how your notes are created. Map metadata dynamically to your frontmatter using simple variables (e.g., `{{title}}`, `{{releaseDate}}`, `{{genres}}`).
- **Calendar View:** Easily see what media is Upcoming and what has recently Released in a clean calendar UI.
- **TV Progress Tracking:** Built-in tracking for TV Shows allowing you to check off watched or skipped episodes by season.
- **Material 3 UI:** A beautiful, responsive, and mobile-friendly user interface built right into Obsidian.

## 🚀 Setup & Installation

To pull metadata automatically, Shelf requires API keys for the services it integrates with.

1. Install the plugin from the Obsidian Community Plugins directory (or manually place the release files in your `.obsidian/plugins/shelf-obsidian` folder).
2. Enable the plugin in your Obsidian settings.
3. Open the **Shelf** settings tab and enter your API keys under the **API Setup** section:
   - **TMDB API Key:** Required for Movies & TV Shows. You can get one for free by creating an account on [TMDB](https://www.themoviedb.org/settings/api).
   - **IGDB Client ID & Secret:** Required for Games. Follow the [IGDB API documentation](https://api-docs.igdb.com/#account-creation) to generate your Twitch Developer credentials.
   - **Google Books API Key:** Optional but highly recommended to avoid rate limits when fetching books. You can generate one via the [Google Cloud Console](https://console.cloud.google.com/).

## ⚙️ Configuration

In the Shelf settings, you can define your vault setup:

- **Folder Destinations:** Choose exactly which folders in your vault Shelf should save new media notes to (e.g., `Library/Movies`, `Library/Games`).
- **Templates:** Customize the exact markdown layout and frontmatter generated when you add a new item. 

### Supported Template Variables

**⚠️ Important:** The `{{externalId}}` variable is strictly required in all of your templates. Without it, the plugin will not be able to sync or refresh metadata for your items!

- **Common:** `{{title}}`, `{{coverUrl}}`, `{{releaseDate}}`, `{{releaseState}}`, `{{externalId}}`
- **Movies & TV:** `{{overview}}`, `{{rating}}`, `{{originalLanguage}}`, `{{genres}}`, `{{studios}}`, `{{directors}}`
- **Games:** `{{summary}}`, `{{rating}}`, `{{genres}}`, `{{developer}}`
- **Books:** `{{authors}}`, `{{genres}}`, `{{publisher}}`, `{{pageCount}}`, `{{description}}`

## 📖 Usage

1. **Open the Shelf:** Click the book/library icon in your left ribbon to open the Shelf view.
2. **Add Media:** Click the **Add Media** button (the `+` icon), select your media type, and search for the title. Click on the correct search result to instantly generate a note in your vault!
3. **Refresh Metadata:** If an item's release date changes, or you just want to update the metadata, click the refresh `↻` button on any media card to instantly sync the latest data from the API to your markdown note without overwriting your personal tracking statuses.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/AndyPandy1189/shelf-obsidian/issues).

## 📝 License

This project is [MIT](https://choosealicense.com/licenses/mit/) licensed.
