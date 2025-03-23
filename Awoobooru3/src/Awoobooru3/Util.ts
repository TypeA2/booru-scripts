export function* array_chunks<T>(arr: T[], n: number): Generator<T[]> {
    for (let i = 0; i < arr.length; i += n) {
        yield arr.slice(i, i + n);
    }
}
