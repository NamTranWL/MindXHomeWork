import { Command, CommanderError } from 'commander';
import { ValidationError } from '../errors';
import { parseTicketId, type Ticket } from '../models/ticket';
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

interface ListOptions {
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

  program
    .command('list')
    .description('list tickets')
    .option('--status <status>')
    .option('--priority <priority>')
    .option('--tags <tags>', 'comma-separated, repeatable; ticket must have all', collect)
    .action(async (options: ListOptions) => {
      const tickets = await service.list(options);
      if (tickets.length === 0) {
        io.stdout('No tickets found\n');
        return;
      }
      for (const ticket of tickets) io.stdout(formatLine(ticket));
    });

  program
    .command('show')
    .description('show ticket details')
    .argument('<id>')
    .action(async (rawId: string) => {
      const ticket = await service.get(parseTicketId(rawId));
      io.stdout(formatDetails(ticket));
    });

  program
    .command('update')
    .description('change ticket status')
    .argument('<id>')
    .option('--status <status>')
    .action(async (rawId: string, options: { status?: string }) => {
      const ticket = await service.updateStatus(parseTicketId(rawId), options.status);
      io.stdout(`Updated ticket #${ticket.id}: status = ${ticket.status}\n`);
    });

  try {
    await program.parseAsync(argv, { from: 'user' });
    return 0;
  } catch (error) {
    return reportError(error, io);
  }
}

function formatLine(ticket: Ticket): string {
  const tags = ticket.tags.length > 0 ? ` (tags: ${ticket.tags.join(', ')})` : '';
  return `#${ticket.id} [${ticket.status}] [${ticket.priority}] ${ticket.title}${tags}\n`;
}

function formatDetails(ticket: Ticket): string {
  return [
    `ID: ${ticket.id}`,
    `Title: ${ticket.title}`,
    `Description: ${ticket.description || '-'}`,
    `Status: ${ticket.status}`,
    `Priority: ${ticket.priority}`,
    `Tags: ${ticket.tags.length > 0 ? ticket.tags.join(', ') : '-'}`,
  ]
    .map((line) => line + '\n')
    .join('');
}

function reportError(error: unknown, io: RunIO): number {
  if (error instanceof CommanderError) return error.exitCode === 0 ? 0 : 2;
  const message = error instanceof Error ? error.message : String(error);
  io.stderr(`Error: ${message}\n`);
  return error instanceof ValidationError ? 2 : 1;
}
