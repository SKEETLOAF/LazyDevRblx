import { diagnose } from '../src/doctor.mjs';

const json = process.argv.includes('--json');
const report = await diagnose();
if (json) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} else {
  const line = (name, value) => process.stdout.write(name + ': ' + value + '\n');
  line('Node.js', report.node.version + (report.node.supported ? ' (supported)' : ' (upgrade required)'));
  line('LAZY MCP bridge', report.lazyBridge.state +
    (report.lazyBridge.toolCount === null ? '' : ' (' + report.lazyBridge.toolCount + ' tools)'));
  if (report.lazyBridge.missingTools.length) {
    line('Missing tools', report.lazyBridge.missingTools.join(', '));
  }
  line('Opt-in evidence', report.sharedEvidence.state +
    (report.sharedEvidence.structures === null ? '' :
      ' (scripts ' + report.sharedEvidence.scripts +
      ', structures ' + report.sharedEvidence.structures +
      ', viewports ' + report.sharedEvidence.viewports + ')'));
  line('Native Studio launcher detected', String(report.nativeStudio.launcherFound));
  line('Native Studio MCP connection', report.nativeStudio.connection);
  line('Live Studio verified', 'no (requires a real Studio test)');
  line('End-to-end workflow verified', 'no (requires a real Studio test)');
  if (report.nextSteps.length) {
    process.stdout.write('Next actions:\n');
    for (const step of report.nextSteps) process.stdout.write('  - ' + step + '\n');
  }
}
if (!report.node.supported || report.lazyBridge.state !== 'connected' ||
    report.lazyBridge.missingTools.length) process.exitCode = 1;
