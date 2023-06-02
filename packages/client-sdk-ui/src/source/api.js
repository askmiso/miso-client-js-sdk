import { mapAsyncIterator } from '@miso.ai/commons';
import { ROLE } from '../constants';
import { postProcessQuestionsResponse } from './utils';

export default function(client) {
    // TODO: send uuid & unit id
    return async ({ group, name, payload, options }) => {
    switch (group) {
      case 'ask':
        switch (name) {
          case 'questions':
            const { signal } = options || {};
            const answer = await client.api[group][name](payload, options);
            signal && signal.addEventListener && signal.addEventListener('abort', () => answer.abort());
            return mapAsyncIterator(answer, postProcessQuestionsResponse);
        }
    }
    return postProcess(await client.api[group]._run(name, payload, options));
  };
}

function postProcess(response) {
  // TODO: more API types
  // search, u2p, p2p
  return {
    [ROLE.RESULTS]: response.products,
  };
}
