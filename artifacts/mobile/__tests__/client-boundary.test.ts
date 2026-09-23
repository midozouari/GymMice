// Keep Node-only inspection inside Jest; do not add Node ambient types to the app.
export {};
declare const __dirname: string;
const fs = jest.requireActual<{
  existsSync(path: string): boolean;
  readdirSync(path: string, options: { withFileTypes: true }): {
    name: string; isDirectory(): boolean;
  }[];
  readFileSync(path: string, encoding: 'utf8'): string;
}>('node:fs');
const path = jest.requireActual<{
  resolve(...parts: string[]): string;
  join(...parts: string[]): string;
  relative(from: string, to: string): string;
}>('node:path');

const mobile = path.resolve(__dirname, '..');
const client = path.resolve(mobile, '../../lib/api-client-react/src');

function sources(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) return sources(filename);
    return /\.[jt]sx?$/.test(filename) ? [filename] : [];
  });
}

describe('client/server boundary', () => {
  const files = [
    ...['app', 'components', 'constants', 'context', 'hooks', 'lib', 'config']
      .flatMap(folder => sources(path.join(mobile, folder))),
    ...sources(client),
  ];

  it('covers mobile and the shared generated-client source', () => {
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContain(path.join(client, 'custom-fetch.ts'));
  });

  it.each(files.map(filename => [path.relative(mobile, filename), filename]))(
    '%s does not import server packages or read server secrets',
    (_label, filename) => {
      const source = fs.readFileSync(filename, 'utf8');
      expect(source).not.toMatch(
        /(?:from\s*|import\s*\(|require\s*\()\s*['"][^'"]*(?:@workspace\/(?:db|api-server)|artifacts\/api-server|lib\/db|(?:^|\/)(?:pg|express|drizzle-orm))[^'"]*['"]/,
      );
      expect(source).not.toMatch(
        /process\.env(?:\.(?:DATABASE_URL|MIGRATION_DATABASE_URL|TEST_DATABASE_URL|SESSION_SECRET|CLERK_SECRET_KEY|REPLIT_EXPO_SESSION_SECRET)\b|\[['"](?:DATABASE_URL|MIGRATION_DATABASE_URL|SESSION_SECRET|CLERK_SECRET_KEY|REPLIT_EXPO_SESSION_SECRET)['"]\])/,
      );
      expect(source).not.toMatch(/(?:JSON\.stringify|Object\.(?:keys|values|entries))\(\s*process\.env/);
      expect(source).not.toMatch(/(?:postgres(?:ql)?:\/\/)[^'"\s]+/);
    },
  );
});