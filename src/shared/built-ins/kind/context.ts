import { LogSink } from "../../log";

// Dependencies which are passed to a Kind's functions
export interface KindCommandContext<LL extends string[] = string[]> {
	logger: LogSink<LL>;
	warnLevel: LL[number];
	executor: Player | undefined;
}
