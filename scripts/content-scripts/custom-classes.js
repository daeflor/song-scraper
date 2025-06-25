globalThis.songScraperCustomClasses = {};

/**
 * A Track contains properties for each piece of track metadata scraped from the DOM
 */
globalThis.songScraperCustomClasses.Track = class {
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

globalThis.songScraperCustomClasses.ScrapeInProgressDialog = class {
    #dialog;
    #dialogText;
    constructor() {
        this.#dialog = document.createElement('dialog');
        this.#dialog.style.textAlign = 'center';
        this.#dialog.style.color = '#FFCC66';
        this.#dialog.style.backgroundColor = '#303030';
        this.#dialog.style.fontFamily = 'Gill Sans';

        this.#dialog.addEventListener('close', () => this.#dialog.remove());

        this.#dialogText = document.createElement('h3');
        this.#dialogText.textContent = 'Scrape In Progress...';
        this.#dialogText.style.marginBottom = '5px';
        
        this.#dialog.append(this.#dialogText);
        document.body.append(this.#dialog);

        this.#dialog.showModal();
    }

    /**
     * Updates the text displayed in the dialog
     * @param {string} value The text string value to show in the dialog modal
     */
    set text(value) {
        this.#dialogText.textContent = value;
    }

    /**
     * Closes the dialog modal
     */
    close() {
        this.#dialog.close();
    }

    /**
     * Adds a form to the dialog that prompts the user to copy the provided data to the clipboard
     * @param {string[]} results An array of strings that will be converted to a csv and copied to the clipboard if the corresponding button is pressed
     */
    addCopyToClipboardPrompt(results) {
        const closeButton = new CustomButton('Close').element;
        const clipboardButton = new CustomButton('Copy to Clipboard').element;
        clipboardButton.addEventListener('click', () => navigator.clipboard.writeText(globalThis.convertArrayToSingleColumnCSV(results)));

        const form = document.createElement('form');
        form.method = 'dialog';
        form.append(closeButton, clipboardButton);
        this.#dialog.append(form);
    }
}

class CustomButton {
    #buttonElement;
    constructor(text) {
        this.#buttonElement = document.createElement('button');
        this.#buttonElement.textContent= text;
        this.#buttonElement.style.margin = '10px';
        this.#buttonElement.style.color = '#505739';
        this.#buttonElement.style.backgroundColor = '#eae0c2';
        this.#buttonElement.style.padding = '10px';
        this.#buttonElement.style.borderRadius = '15px';
    }

    get element() {
        return this.#buttonElement;
    }
}