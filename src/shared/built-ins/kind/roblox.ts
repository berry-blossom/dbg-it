import { t } from "@rbxts/t";
import { Kind } from "../../kind";
import { KindCommandContext } from "./context";
import { Players } from "@rbxts/services";
import { ReadOnlyTokenStream, TokenStream } from "../../token";
import { KindErrors } from "../../messages";

export class PlayersKind<T extends Player[]> extends Kind<T> {
	// TODO Eventually create a CSV kind and extend from that
	public macros: Record<string, (ctx: KindCommandContext) => Player[]> = {
		["@s"]: (ctx: KindCommandContext) => [ctx.executor!],
		["@a"]: () => Players.GetPlayers(),
		["@o"]: (ctx: KindCommandContext) =>
			Players.GetPlayers().mapFiltered((p) => (p === ctx.executor ? undefined : p)),
	};

	public constructor() {
		super("[Player]");
	}

	public transform<LL extends string[] = string[]>(data: string, ctx: KindCommandContext<LL>): T | undefined {
		const tokens = TokenStream.create(data);
		let csvValues: string[] = [];
		const ret: T = new Array<Player>() as T;

		while (tokens.inRange()) {
			csvValues.push(tokens.get().lower());
			tokens.next();
		}

		csvValues = string.split(csvValues.join(","), ",");

		const playersByName = {} as Record<string, Player>;
		Players.GetPlayers().forEach((v) => (playersByName[v.Name.lower()] = v));

		for (const [k, _] of pairs(this.macros)) {
			if (Players.FindFirstChild(k) === undefined) continue;

			// This will almost certainly never happen, but incase *somehow* a player with a name of a macro joins
			// we still want a way to execute commands on them.
			// It may be worth considering blocking out command execution entirely if a player with a macro name joins
			// but for now I think putting a warning in the console is good enough.

			ctx.logger.append(ctx.warnLevel, KindErrors.PLAYER_KIND_MACRO_OVERRIDE.format(k));
			delete playersByName[k];
			playersByName[`_${k}`] = Players.FindFirstChild(k) as Player;
		}

		csvValues.forEach((v) => {
			const plr = playersByName[v];
			if (plr !== undefined) {
				if (!ret.includes(plr)) ret.push(plr);
			}
			const macro = this.macros[v];
			if (macro === undefined) return;
			macro(ctx as never).forEach((v) => {
				if (ret.includes(v)) return;
				ret.push(v);
			});
		});

		return ret;
	}

	public verify<LL extends string[] = string[]>(data: unknown, ctx: KindCommandContext<LL>): data is T {
		return t.array(t.instanceIsA("Player"))(data);
	}

	public suggestions(tokenS: ReadOnlyTokenStream): string[] {
		const macroKeys: string[] = [];
		const playerNames: string[] = [];

		for (const [k, _] of pairs(this.macros)) macroKeys.push(k);
		Players.GetPlayers().forEach((p) => {
			// See comment in transform method above for why this is done
			if (this.macros[p.Name] !== undefined) {
				playerNames.push(`_${p.Name}`);
				return;
			}
			playerNames.push(p.Name);
		});

		return [...macroKeys, ...playerNames];
	}
}
