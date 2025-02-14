export enum ExecutionError {
	NOCMD = 'Command "%s" not found',
	UNIMPL = 'No implementation for "%s", did you specify enough arguments?',
	BADPERM = "You do not have permission to execute that command.",
	UNEXP = "Unexpected error while executing command: %s",
}

export enum CommandSyntaxError {
	TOOLONG = "Command was too long, did you specify the correct number of arguments?",
	BADARG = 'Invalid argument "%s"!, expected %s',
	TOOSHORT = "Command was too short, did you specify the correct number of arguments?",
}

export enum RegistryWarnings {
	OVERWRITTEN = 'Command "%s" was registered more than once and will be overwritten!',
	ARGPRIORITY = 'Command "%s" @ token "%s" had conflicting arguments! Consider using subcommands to elimate conflicts.',
}

export enum KindErrors {
	CSV_KIND_MACRO_COLLISION = "CSV Kind of %s has macro '%s' which collides with a value. To run command with that value, prefix it with an underscore: '_%s'.",
}
