export default class Logger {
    protected instance_name: string;

    private log(func: (...args: unknown[]) => void, ...args: unknown[]) {
        func.apply(null, [ `[${this.instance_name}]`, ...args ]);
    }

    public debug(...args: unknown[]) { this.log(console.debug, ...args); }
    public info (...args: unknown[]) { this.log(console.info,  ...args); }
    public warn (...args: unknown[]) { this.log(console.warn,  ...args); }
    public error(...args: unknown[]) { this.log(console.error, ...args); }

    public constructor(name: string) {
        this.instance_name = name;
    }
}
