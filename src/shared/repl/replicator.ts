import linked_list from "@rbxts/berry-linked-list";
import { CommandRegistry } from "../dbg-it";
import { DefaultMainConfig } from "../dbg-it/config";
import { CommandsSpecifier } from "../dbg-it/main";
import { LogSink } from "../log";
import { BOUNDARY, DefRemotes, remote, RemotesLoader } from "./sharedRemotes";

export type SharedReplicatorLogLevels = (typeof DefaultMainConfig)["logLevels"];

export const dbgItRemotes = {
	// Client -> Server Handshake, which lets the server know that a client is ready to start
	c2sHandshake: remote("c2sHandshake", BOUNDARY.C2S),
	// Client -> Server command execution, the client is attempting to run a command
	c2sExecuteCommand: remote("c2sExecuteCommand", BOUNDARY.C2S),
	// Server -> Client command result, the server is sending the client the result of a command that was run
	s2cSendCommandResult: remote("s2cReceiveCommandResult", BOUNDARY.S2C),
	// Server -> Client serialized command, the server is sending (a) serialized command(s)
	s2cSendSerCommand: remote("s2cSendSerCommand", BOUNDARY.S2C),
	// Server -> Client custom replication, the server is sending the client a custom replication event.
	s2cSendReplCommand: remote("s2cSendReplCommand", BOUNDARY.S2C),
} satisfies DefRemotes;

export abstract class SharedReplicator {
	public readonly specifiers: linked_list<CommandsSpecifier<SharedReplicatorLogLevels>> = new linked_list();
	public readonly registry: CommandRegistry<undefined, SharedReplicatorLogLevels> = CommandRegistry.create(
		0,
		new LogSink(...DefaultMainConfig.logLevels).setPrefix("sharedReplicator"),
		"WARN",
	);
	public readonly remotes: RemotesLoader<typeof dbgItRemotes>;
	public constructor() {
		// See .load for why this is async, and why I call .expect here.
		// This shouldn't error.
		this.remotes = RemotesLoader.load(dbgItRemotes).expect();
	}
	public init() {
		this.specifiers.forEach((spec) => {
			spec(this.registry);
		});
	}
}
