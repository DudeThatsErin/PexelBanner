import { FuzzySuggestModal, getIconIds, setIcon } from 'obsidian';

// Obsidian ships Lucide itself, so this works without an icon pack or network
// connection on both desktop and mobile.
export class LucideIconSelectionModal extends FuzzySuggestModal {
    constructor(app, onChoose) {
        super(app);
        this.onChoose = onChoose;
        this.setPlaceholder('Search Lucide icons…');
    }

    getItems() { return getIconIds(); }
    getItemText(iconName) { return iconName; }

    renderSuggestion(iconName, el) {
        const iconEl = el.createSpan({ cls: 'pixel-banner-lucide-preview' });
        setIcon(iconEl, iconName);
        el.createSpan({ text: iconName });
    }

    onChooseItem(iconName) { this.onChoose(iconName); }
}
