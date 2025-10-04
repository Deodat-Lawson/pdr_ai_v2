// 1) A helper function that retries fetch up to `maxRetries` times
export async function fetchWithRetries(
    url: string,
    options: RequestInit = {},
    maxRetries = 5
) {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const res = await fetch(url, options);

            if (!res.ok) {
                const rawErrorData: unknown = await res.json().catch(() => ({}));

                if (typeof rawErrorData !== "object") {
                    throw new Error(`Request failed with status ${res.status}`);
                }

                const errorData = rawErrorData as { error?: string };

                throw new Error(errorData.error ?? `Request failed with status ${res.status}`);
            }

            const data: unknown = await res.json();
            return data;
        } catch (err: unknown) {
            lastError = err;

            if (err instanceof Error) {
                const isTimeoutError =
                    /timed out/i.test(err.message) || err.name === "AbortError";

                if (isTimeoutError && attempt < maxRetries) {
                    console.warn(`Attempt ${attempt} failed due to timeout, retrying...`);
                    continue;
                }

                throw err;
            } else {
                throw new Error(`Non-Error thrown: ${String(err)}`);
            }
        }
    }

    // If we somehow exit the loop, throw the last error
    // If `lastError` is not an Error, wrap it
    if (!(lastError instanceof Error)) {
        throw new Error(`Non-Error thrown: ${String(lastError)}`);
    }
    throw lastError;
}