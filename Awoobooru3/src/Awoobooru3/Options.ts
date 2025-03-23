import Feature from "./Feature";
import Logger from "./Logger";

interface Option {
    key: string;
    caption: string;
}

interface EnableOption extends Option {
    type: "enable";
    defval: boolean;
}

interface TableSelectColumn {
    type: "select";
    key: string;
    options: string[];
}

interface TableRegexColumn {
    type: "regex";
    key: string;
}

interface TableTextColumn {
    type: "text";
    key: string;
}

type TableColumn = TableSelectColumn | TableRegexColumn | TableTextColumn;
type TableValue = {
    [key: string]: string
};

interface TableOption extends Option {
    type: "table";
    columns: TableColumn[];
    defval: TableValue[];
}

type OptionSchema = (EnableOption | TableOption)[];

const DEFAULT_OPTIONS: OptionSchema = [
    {
        key: "oneup.enabled",
        caption: "Easy 1up",
        type: "enable",
        defval: true,
    },
    {
        key: "tag_checker.enabled",
        caption: "Tag checker",
        type: "enable",
        defval: true
    },
    {
        key: "tag_checker.autocorrect.enabled",
        caption: "Autocorrect",
        type: "enable",
        defval: true,
    }
];

const logger = new Logger("Options");

export default class Options {
    private static features: { [key: string]: Feature; } = {};

    static {
        window.addEventListener("storage", this.storage_change);
    }

    private static get_value<T>(key: string): T {
        return JSON.parse(localStorage.getItem(key));
    }

    private static set_value(key: string, value: unknown): void {
        localStorage.setItem(key, JSON.stringify(value));
    }
    
    private static storage_change(e: StorageEvent): void {
        /* Not for us */
        if (!e.key.startsWith("awoo.")) {
            return;
        }

        const old_val = JSON.parse(e.oldValue);
        const new_val = JSON.parse(e.newValue);

        if (e.key in this.features) {
            if (new_val === true && old_val !== true) {
                this.features[e.key].enable();
            } else {
                this.features[e.key].disable();
            }
        } else {
            logger.warn(`Ignoring update for ${e.key} (newValue: ${e.newValue})`);
        }
    }


    public static register_feature(path: string, instance: Feature): boolean {
        const key = "awoo." + path + ".enabled";

        if (key in this.features) {
            throw new Error(`Feature already registered: ${key}`);
        }

        this.features[key] = instance;

        logger.info(`Registered feature ${instance.name}`);

        switch (this.get_value<boolean>(key)) {
            case false:
                return false;

            case null:
                this.set_value(key, true); /* Default to enabled */

                /* fallthrough */

            case true:
                instance.enable();
                return true;
        }

    }
}
