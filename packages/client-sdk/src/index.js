import MisoClient from './detached';
import cmd from './cmd';

MisoClient.attach();

cmd();

export default MisoClient;
