
export default abstract class Feature {
    public abstract enable(): void;
    public abstract disable(): void;

    public get name(): string { 
        return this.class_name;
    }

    private class_name: string;

    protected constructor(name: string) {
        this.class_name = name;
    }
}
