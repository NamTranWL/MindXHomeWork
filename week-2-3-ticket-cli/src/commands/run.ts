import { Command, CommanderError } from 'commander';
import { ValidationError } from '../errors';
import { createKBClient } from '../kb/config';
import type { KBClient } from '../kb/kb-client';
import { parseTicketId } from '../models/ticket';
import { formatDetails, formatDocumentDetails, formatDocumentLine, formatLine, formatSearchResult } from './format';
import { KBService } from '../services/kb-service';
import { TicketService } from '../services/ticket-service';
import { JsonFileRepository } from '../storage/json-file-repository';

export interface RunIO {
  env: Record<string, string | undefined>;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

/** Phụ thuộc truyền từ ngoài vào, chỉ dùng trong test. Có `kbClient` thì bỏ qua KB_CLIENT / KB_API_URL. */
export interface RunDeps {
  kbClient?: KBClient;
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
export async function run(argv: string[], io: RunIO, deps: RunDeps = {}): Promise<number> {
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

  addKBCommands(program, io, deps);

  try {
    await program.parseAsync(argv, { from: 'user' });
    return 0;
  } catch (error) {
    return reportError(error, io);
  }
}

/** Nhóm lệnh `tickets kb ...` (SPEC Phần B). Client chỉ được tạo khi input đã hợp lệ. */
function addKBCommands(program: Command, io: RunIO, deps: RunDeps): void {
  const service = new KBService(() => deps.kbClient ?? createKBClient(io.env));
  const kb = program.command('kb').description('query the Knowledge Base (KB_CLIENT=mock|http)');

  kb.command('search')
    .description('search documents by keyword in title, tags and content')
    .argument('<query>')
    .option('--top-k <n>', 'maximum number of results, 1-50 (default 5)')
    .action(async (query: string, options: { topK?: string }) => {
      const results = await service.search({ query, topK: options.topK });
      if (results.length === 0) {
        io.stdout('No documents found\n');
        return;
      }
      for (const result of results) io.stdout(formatSearchResult(result));
    });

  kb.command('list')
    .description('list documents in a node')
    .option('--node <path>', 'node path, e.g. /templates/email')
    .option('--limit <n>', 'maximum number of documents, 1-100 (default 10)')
    .option('--recursive', 'include documents in child nodes')
    .action(async (options: { node?: string; limit?: string; recursive?: boolean }) => {
      const docs = await service.list(options);
      if (docs.length === 0) {
        io.stdout('No documents found\n');
        return;
      }
      for (const doc of docs) io.stdout(formatDocumentLine(doc));
    });

  kb.command('retrieve')
    .description('show a document with its content')
    .argument('<id>')
    .action(async (id: string) => {
      io.stdout(formatDocumentDetails(await service.retrieve(id)));
    });

  kb.command('add')
    .description('add a document from a markdown file')
    .option('--file <file>', 'markdown file to read the content from')
    .option('--path <node>', 'node path to add the document to')
    .option('--title <title>', 'title (default: first "# " heading, then file name)')
    .option('--tags <tags>', 'comma-separated, repeatable', collect)
    .action(async (options: { file?: string; path?: string; title?: string; tags?: string[] }) => {
      const doc = await service.add(options);
      io.stdout(`Added document ${doc.id} at ${doc.nodePath}\n`);
    });
}

function reportError(error: unknown, io: RunIO): number {
  if (error instanceof CommanderError) return error.exitCode === 0 ? 0 : 2;
  const message = error instanceof Error ? error.message : String(error);
  io.stderr(`Error: ${message}\n`);
  return error instanceof ValidationError ? 2 : 1;
}
