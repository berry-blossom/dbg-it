import { BrickColorKind, Color3Kind, Kind, PlayersKind, Vector2Kind, Vector3Kind } from "../../shared";
import { SerializedArgLabelToKind } from "../../shared/command";
import { Main } from "../../shared/dbg-it";
import { DbgItConfig, DefaultMainConfig } from "../../shared/dbg-it/config";
import { DeepDefaults, EnsureRequired } from "../../shared/util/type";
import { ClientReplicator } from "./clientReplicator";

export interface ClientConfig {
	replicator: boolean;
}

let singleton: DbgItClient;

export class DbgItClient<T extends Partial<DbgItConfig> = typeof DefaultMainConfig> extends Main<T> {
	/** @hidden */ public readonly replicator: ClientReplicator<T>;
	/** @hidden */ protected declare readonly _settings: Readonly<
		DeepDefaults<DbgItConfig, EnsureRequired<T>, typeof DefaultMainConfig>
	> &
		Partial<ClientConfig>;
	protected constructor(settings?: T & Partial<ClientConfig>) {
		super(settings);

		// Add shared builtins kinds
		this.addSharedKind(new PlayersKind())
			.addSharedKind(new Vector2Kind())
			.addSharedKind(new Vector3Kind())
			.addSharedKind(new Color3Kind())
			.addSharedKind(new BrickColorKind());

		this.replicator = new ClientReplicator(this);
	}

	/**
	 *
	 * @param replicator If the replicator should start of not
	 * @returns The DbgIt Client.
	 */
	public start(replicator: boolean = this._settings?.replicator ?? true) {
		super.start();

		if (replicator) {
			this.replicator.builtins();
			this.replicator.init();
		}
		this._registry.addHook("SERIALIZED_CMD", (ctx) => {
			const [done, err] = this.replicator.executeServerCommand(ctx.commandString).await();
			if (!done) error(err, 0);
			return err;
		});
		return this;
	}

	public addSharedKind<T extends defined>(kind: Kind<T>) {
		SerializedArgLabelToKind.set(kind.label, kind);
		return this;
	}

	public static setup<T extends Partial<DbgItConfig> = typeof DefaultMainConfig>(
		settings?: T & Partial<ClientConfig>,
	): DbgItClient<T> {
		if (singleton !== undefined) return singleton as never;
		singleton = new DbgItClient(settings) as never;
		return singleton as never;
	}
}
