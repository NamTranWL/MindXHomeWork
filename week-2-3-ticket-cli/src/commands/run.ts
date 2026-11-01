import { Command, CommanderError } from 'commander';
import { ValidationError } from '../errors';
import { TicketService } from '../services/ticket-service';
import { JsonFileRepository } from '../storage/json-file-repository';

export interface RunIO {
  env: Record<string, string | undefined>;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

interface CreateOptions {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  tags?: string[];
}

const collect = (value: string, previous: string[] = []) => [...previous, value];

/** Chạy CLI với argv (không gồm "node" và tên script); trả về exit code thay vì gọi process.exit. */
export async function run(argv: string[], io: RunIO): Promise<number> {
  const service = new TicketService(new JsonFileRepository(io.env.TICKETS_FILE ?? 'tickets.json'));
  const program = new Command('tickets')
    .exitOverride()
    .configureOutput({ writeOut: io.stdout, writeErr: io.stderr });

  program
    .command('create')
    .description('create a ticket')
    .option('--title <title>')
    .option('--description <description>')
    .option('--status <status>')
    .option('--priority <priority>')
    .option('--tags <tags>', 'comma-separated, repeatable', collect)
    .action(async (options: CreateOptions) => {
      const ticket = await service.create(options);
      io.stdout(`Created ticket #${ticket.id}\n`);
    });

  try {
    await program.parseAsync(argv, { from: 'user' });
    return 0;
  } catch (error) {
    return reportError(error, io);
  }
}

function reportError(error: unknown, io: RunIO): number {
  if (error instanceof CommanderError) return error.exitCode === 0 ? 0 : 2;
  const message = error instanceof Error ? error.message : String(error);
  io.stderr(`Error: ${message}\n`);
  return error instanceof ValidationError ? 2 : 1;
}
