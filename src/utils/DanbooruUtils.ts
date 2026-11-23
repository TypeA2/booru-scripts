// Because it's hidden and this is easier
// https://github.com/danbooru/danbooru/blob/master/app/javascript/src/javascripts/utility.js#L155
export async function upload_files(files: File[]): Promise<number> {
    const form_data = new FormData();
    for (let i = 0; i < files.length; ++i) {
        form_data.append(`upload[files][${i}]`, files[i]);
    }

    const response = await fetch("/uploads.json", {
        method: "POST",
        headers: { "X-CSRF-Token": Danbooru.Utility.meta("csrf-token") },
        body: form_data,
    });

    let upload = await response.json();
    while (upload.status !== "completed") {
        if (upload.status === "error") {
            throw new Error(_.escape(upload.error || "Unknown error"));
        }

        await new Promise(resolve => setTimeout(resolve, 250));
        upload = await $.get(`/uploads/${upload.id}.json`);
    }

    return upload.id;
}

interface Upload {
    id: number;
    status: string;
    error: string | null;
}

export async function upload_url(url: string): Promise<Upload> {
    const form_data = new FormData();
    form_data.append("upload[source]", url);

    const response = await fetch("/uploads.json", {
        method: "POST",
        headers: { "X-CSRF-Token": Danbooru.Utility.meta("csrf-token") },
        body: form_data,
    });

    let upload = await response.json();
    while (upload.status !== "completed") {
        if (upload.status === "error") {
            return upload;
        }

        await new Promise(resolve => setTimeout(resolve, 250));
        upload = await $.get(`/uploads/${upload.id}.json`);
    }

    return upload;
}

export interface SourceData {
    page_url: string;
    image_urls: string[];
    artist: {
        display_name: string | null;
        username: string | null;
        profile_urls: string[];
        artists: { id: number; name: string }[]
    };

    published_at: string | null;
    updated_at: string | null;

    tags: [string, string][];

    artist_commentary: {
        title: string;
        description: string;
        dtext_title: string;
        dtext_description: string;
    };
}

export async function source_data(url: string): Promise<SourceData> {
    return fetch("/source.json?" + new URLSearchParams({ url })).then(r => r.json());
}
