const Path = require("path");
const fs = require("fs");
const ChildProcess = require("child_process");
const args = require("args");
const hasYarn = require("has-yarn");
const os = require("os");

const [defaultNpmClient, defaultNpmCommand] = hasYarn()
  ? ["yarn", "upgrade"]
  : ["npm", "install"];

args
  .option(["n", "npmClient"], "NPM client", defaultNpmClient)
  .option(
    ["c", "npmClientCommand"],
    "NPM client command to execute",
    defaultNpmCommand
  )
  .option(["t", "tag"], "NPM tag", "latest")
  .option("v", "Show version")
  .option("h", "Show help")
  .option(["f", "filter"], "Filter package names")


const flags = args.parse(process.argv, {
  value: `<scope> [npmClient=${defaultNpmClient}] [npmClientCommand=${defaultNpmCommand}]`,
  help: false,
  version: false
});

if (flags.h) {
  args.showHelp();
}
if (flags.v) {
  console.log(require('../package.json').version)
  process.exit(0)
}

const [
  scope,
  legacyNpmClient = defaultNpmClient,
  legacyClientCommand = defaultNpmCommand
] = args.sub;

const npmClient = flags.npmClient || legacyNpmClient;
const clientCommand = flags.npmClientCommand || legacyClientCommand;

if (!scope) {
  args.showHelp();
}

const { dependencies = {}, devDependencies = {} } = JSON.parse(
  fs.readFileSync(Path.join(process.cwd(), "./package.json"))
);

const packagesToIgnore = []

if (flags.f) {
  packagesToIgnore.push(...flags.f.split(','))
}

const checkForSubset = (mainString, arrayOfElements) => {
  for (const element of arrayOfElements) {
    if (mainString.includes(element) && mainString !== element) {
      return element;
    }
  }
  return null;
};


const packageNames = Array.from(
  new Set(
    [...Object.keys(dependencies), ...Object.keys(devDependencies)].filter(_ =>
      _.startsWith(scope) && !checkForSubset(_, packagesToIgnore)
    )
  )
).sort();

if (!packageNames.length) {
  console.log(`Found 0 packages with scope "${scope}"`);
  return;
}

const packageNamesWithVersion = packageNames.map(_ => `${_}@${flags.tag}`);

console.log(`Found ${packageNames.length} with scope "${scope}":`);
console.log(packageNames);
console.log(
  `Executing "${npmClient} ${clientCommand} ${packageNamesWithVersion.join(
    " "
  )}"`
);

ChildProcess.spawnSync(npmClient, [clientCommand, ...packageNamesWithVersion], {
  stdio: "inherit",
  shell: os.platform() == 'win32'
});
