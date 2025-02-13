import { LogSink } from "../../log";

export interface KindCommandContext<LL extends string[] = string[]> {
	logger: LogSink<LL>;
	warnLevel: LL[number];
	executor: Player | undefined;
}
