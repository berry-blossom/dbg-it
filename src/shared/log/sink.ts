//!native
import linked_list from "@rbxts/berry-linked-list";
import { LogFactory, LogStructure, logStructureFactory } from "./statement";

export type LogSubscription<T extends string[]> = (log: LogStructure<T>) => unknown;

export class ReadonlyLogSink<T extends string[]> {
	protected readonly pendingLogs: linked_list<LogStructure<T>> = new linked_list();
	protected readonly subscriptions: linked_list<LogSubscription<T>> = new linked_list();
	protected readonly levels: T;
	protected readonly factory: LogFactory<T>;
	protected prefix?: string | undefined;
	public constructor(...levels: T) {
		// We can't use a constructor initializer here because we need to spread to
		// preserve string literal types
		this.levels = levels;
		this.factory = logStructureFactory(...levels);
	}
	public subscribe(subscription: LogSubscription<T>): () => void {
		return this.subscriptions.add(subscription);
	}
}

export class LogSink<T extends string[]> extends ReadonlyLogSink<T> {
	public setPrefix(prefix: string) {
		this.prefix = prefix;
		return this;
	}
	public append(level: T[number], ...msg: string[]) {
		this.pendingLogs.add(this.factory(level, msg.join(" "), this.prefix));
	}
	public flush(): LogStructure<T>[] {
		const flushed: LogStructure<T>[] = [];
		this.pendingLogs.forEach((log) => {
			flushed.push(log);
			this.subscriptions.forEach((subscription) => {
				subscription(log);
			});
		});
		this.pendingLogs.clear();
		return flushed;
	}
	public destroy() {
		this.pendingLogs.clear();
		this.subscriptions.clear();
	}
}
