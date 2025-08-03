import path from 'path';
import ClocAnalyzer from './cloc-analyzer';

const command = ClocAnalyzer.getCommandLine();

console.log(command);

const { stdout } = await Bun.$`${command}`.cwd(
    'C:\\Users\\Solstice\\CodeSpace\\nplasopc\\react\\comp'
);
Bun.write('cloc.json', stdout.toString());
