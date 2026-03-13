export enum ExecutionError {
	NOCMD = 'Command "%s" not found',
	UNIMPL = 'No implementation for "%s", did you specify enough arguments?',
	BADPERM = "You do not have permission to execute that command.",
	UNEXP = "Error whilst executing command: %s",
	DESER = "This command has been deserialized and cannot be executed. Please ensure command replication is properly set up.",
	NOHOOK = "Hook %s was not specified",
	HOOKERR = "%s errors: %s",
}

export enum CommandSyntaxError {
	TOOLONG = "Command was too long, did you specify the correct number of arguments?",
	BADARG = 'Invalid argument "%s"!, expected %s',
	TOOSHORT = "Command was too short, did you specify the correct number of arguments?",
}

export enum RegistryWarnings {
	OVERWRITTEN = 'Command "%s" was registered more than once and will be overwritten!',
	ARGPRIORITY = 'Command "%s" @ token "%s" had conflicting valid arguments! Consider using literal subcommands to elimate conflicts.',
	CMDSCMDSERVERSIDE = "SpecificatorUtil.registerCmdsCommand should only be called on the client.",
}

export enum KindErrors {
	CSV_KIND_MACRO_COLLISION = "CSV Kind of %s has macro '%s' which collides with a value. To run command with that value, prefix it with an underscore: '_%s'.",
}

export enum CmdsCommandDescriptions {
	CMDS_MAIN = "Lists all registered commands.\nThis includes commands which you do not have access to.\nCommands are seperated into pages, you may supply an integer as an argument to go to that page.",
	CMDS_PAGE = "Optional page to jump to. Defaults to the first page.",
}
