import { Main } from "../../shared/dbg-it";
import { DbgItConfig, DefaultMainConfig } from "../../shared/dbg-it/config";
import { ServerReplicator } from "./serverReplicator";

export interface ServerConfig {
	replicator: boolean;
}

let singleton: DbgitServer;

export class DbgitServer<T extends Partial<DbgItConfig> = typeof DefaultMainConfig> extends Main<T> {
	/** @hidden */ public readonly replicator: ServerReplicator<T>;
	protected constructor(protected readonly settings?: T & Partial<ServerConfig>) {
		super(settings);
		this.replicator = new ServerReplicator(this);
	}

	public start(replicator: boolean = this.settings?.replicator ?? true) {
		super.start();
		if (replicator) {
			this.replicator.init();
		}
		return this;
	}

	public static setup<T extends Partial<DbgItConfig> = typeof DefaultMainConfig>(
		settings?: T & Partial<ServerConfig>,
	): DbgitServer<T> {
		if (singleton !== undefined) return singleton as never;
		singleton = new DbgitServer(settings) as never;
		singleton.start(settings?.replicator);
		return singleton as never;
	}
}
