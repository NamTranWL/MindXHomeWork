// Kiểm chứng độc lập các khẳng định của AI về Commander ở bước Layered Questioning.
// Chạy trong thư mục week-2-3-ticket-cli (sau npm install):  node ai-usage/verify-commander.cjs
const { Command, CommanderError } = require('commander');
const path = require('node:path');
const fs = require('node:fs');

const pkgPath = path.join(path.dirname(require.resolve('commander')), 'package.json');
const { version } = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

function tryParse(build, argv) {
  let stderr = '';
  const program = build(new Command('tickets'))
    .exitOverride()
    .configureOutput({ writeErr: (s) => { stderr += s; }, writeOut: () => {} });
  try {
    program.parse(argv, { from: 'user' });
    return { ok: true, opts: program.opts() };
  } catch (e) {
    if (e instanceof CommanderError) return { ok: false, exitCode: e.exitCode, code: e.code, stderr: stderr.trim() };
    throw e;
  }
}

console.log(`commander ${version}\n`);

console.log('1) requiredOption("--title") nhưng không truyền --title:');
console.log(tryParse((p) => p.requiredOption('--title <title>'), []));

console.log('\n2) --tags khai báo bình thường, truyền 2 lần (--tags a --tags b):');
console.log(tryParse((p) => p.option('--tags <tags>'), ['--tags', 'a', '--tags', 'b']));

console.log('\n3) --tags với hàm gộp collect, truyền 2 lần:');
const collect = (value, previous = []) => [...previous, value];
console.log(tryParse((p) => p.option('--tags <tags>', 'repeatable', collect), ['--tags', 'a', '--tags', 'b']));

console.log('\n4) Lệnh/option lạ khi đã bật exitOverride (mã gốc của Commander, trước khi map sang 2):');
console.log(tryParse((p) => p.option('--title <title>'), ['--bogus']));
