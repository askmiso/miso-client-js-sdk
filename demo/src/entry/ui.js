import MisoClient from '@miso.ai/client-sdk';
import { DemoPlugin } from '../plugin';

MisoClient.plugins.use(DemoPlugin);
MisoClient.plugins.use('std:ui');
