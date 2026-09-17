import type { Plugin } from 'vite';
import { classRoomUrl, vaultClassCalendar } from '../src/lib/vaultClassCalendar';

// Real file URLs work more consistently in iOS browsers than blob downloads.
export function vaultCalendarAssets(): Plugin {
  const files = ['calendars/vault-trading.ics', 'calendars/vault-wednesday.ics'];
  return { name: 'vault-calendar-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const index = files.indexOf((req.url ?? '').split('?')[0].replace(/^\//, ''));
        if (index < 0) return next();
        if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.end(); return; }
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="${files[index].split('/')[1]}"`);
        res.setHeader('Cache-Control', 'no-cache');
        res.end(req.method === 'HEAD' ? undefined : vaultClassCalendar(index === 1, classRoomUrl(index === 1)));
      });
    },
    generateBundle() {
      files.forEach((fileName, index) => this.emitFile({ type: 'asset', fileName, source: vaultClassCalendar(index === 1, classRoomUrl(index === 1)) }));
    },
  };
}
