globalThis.songScraperCustomClasses = {
    Track: Track
};

/**
 * A Track contains properties for each piece of track metadata scraped from the DOM
 */
class Track {
    constructor(trackContainerElement) {
        const metadataElements = trackContainerElement.getElementsByTagName('yt-formatted-string');
        if (metadataElements[0] instanceof Element === true) {
            this.title = metadataElements[0].title;
        } else console.error("Track title could not be retrieved from DOM.");

        if (metadataElements[1] instanceof Element === true) {
            this.artist = metadataElements[1].title;
        } else console.error("Artist could not be retrieved from DOM.");

        if (metadataElements[2] instanceof Element === true) {
            this.album = metadataElements[2].title;
        } else console.error("Album could not be retrieved from DOM.");

        if (metadataElements[3] instanceof Element === true) {
            this.duration = metadataElements[3].title;
        } else console.warn("Duration could not be retrieved from DOM.");

        if (trackContainerElement.hasAttribute('unplayable')) { //Note: <if (trackContainerElement.unplayable_ === true)> should work but it doesn't for some reason
            this.unplayable = true;
            console.info("Encountered an unplayable track with title: " + this.title);
        }
    }
}