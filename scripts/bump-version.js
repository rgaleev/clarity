const { argv } = require('node:process');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');

const bumpVersion = async () => {
    console.log('Bumping version...');

    const versionPartToBump = getVersionPartToBumpFromCommandLine();
    console.log(`Version part to bump: ${versionPartToBump}`);

    const versionSourceFile = 'packages/clarity-js/src/core/version.ts';
    const jsonFilesToUpdate = [
        'lerna.json',
        'package.json',
        'packages/clarity-decode/package.json',
        'packages/clarity-devtools/package.json',
        'packages/clarity-devtools/static/manifest.json',
        'packages/clarity-js/package.json',
        'packages/clarity-visualize/package.json'
    ];

    try {
        const currentVersion = await getCurrentVersion(versionSourceFile);
        console.log(`Current version: ${currentVersion}`);

        const newVersion = generateNewVersion(currentVersion, versionPartToBump);
        console.log(`New version: ${newVersion}`);

        await updateSourceVersionFile(versionSourceFile, newVersion);
        await updateJsonVersionFiles(jsonFilesToUpdate, newVersion);
        await addVersionFilesToGit(versionSourceFile, jsonFilesToUpdate);

        console.log('Version bump complete.');
    } catch (error) {
        console.error(`Error bumping version: ${error.message}`);
    }
};

const getVersionPartToBumpFromCommandLine = () => {
    let versionPartToBump = 'patch';

    if (argv.length > 2) {
        const versionPartParameter = argv[2];
        const versionPartToBumpParsed = versionPartParameter.split('=')[1];

        switch (versionPartToBumpParsed) {
            case 'major':
                versionPartToBump = 'major';
                break;
            case 'minor':
                versionPartToBump = 'minor';
                break;
            case 'patch':
                versionPartToBump = 'patch';
                break;
            default:
                versionPartToBump = 'patch';
        }
    }
    return versionPartToBump;
};

const getCurrentVersion = async (versionSourceFile) => {
    const versionFileContent = await fs.readFile(getFullFilePath(versionSourceFile), 'utf-8');
    const versionMatch = versionFileContent.match(/(?<=version = ")[^"]+/);

    if (!versionMatch) {
        throw new Error('Version format is invalid');
    }

    return versionMatch[0];
};

const generateNewVersion = (version, versionPartToBump) => {
    const versionParts = version.split('.');

    if (versionParts.length !== 3) {
        throw new Error('Version format is invalid');
    }
    switch (versionPartToBump) {
        case 'major':
            versionParts[0] = (parseInt(versionParts[0]) + 1).toString();
            versionParts[1] = '0';
            versionParts[2] = '0';
            break;
        case 'minor':
            versionParts[1] = (parseInt(versionParts[1]) + 1).toString();
            versionParts[2] = '0';
            break;
        case 'patch':
        default:
            versionParts[2] = (parseInt(versionParts[2]) + 1).toString();
    }

    return versionParts.join('.');
};

const updateSourceVersionFile = async (versionSourceFile, newVersion) => {
    console.log(`Updating ${versionSourceFile}...`);
    const versionFileContent = await fs.readFile(getFullFilePath(versionSourceFile), 'utf-8');
    const newVersionFileContent = versionFileContent.replace(/(?<=version = ")[^"]+/, newVersion);
    await fs.writeFile(getFullFilePath(versionSourceFile), newVersionFileContent, 'utf-8');
};

const updateJsonVersionFiles = async (filesToUpdate, newVersion) => {
    for (const filePath of filesToUpdate) {
        console.log(`Updating ${filePath}...`);
        const fileContent = await fs.readFile(getFullFilePath(filePath), 'utf-8');
        const newFileContent = fileContent.replace(/(?<="version": ")[^"]+/, newVersion);
        await fs.writeFile(getFullFilePath(filePath), newFileContent, 'utf-8');
    }
};

const addVersionFilesToGit = async (versionSourceFile, jsonFilesToUpdate) => {
    const filesToGitAdd = [versionSourceFile, ...jsonFilesToUpdate];
    const filesToGitAddStr = filesToGitAdd.map(file => `"${getFullFilePath(file)}"`).join(' ');

    exec(`git add ${filesToGitAddStr}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing git command: ${error}`);
            return;
        }

        console.log('Changed version files added to git.');

        if (stderr) {
            console.error(`Git command error output: ${stderr}`);
        }
    });
};

const getFullFilePath = (filePath) => {
    return path.resolve(__dirname, '../', filePath);
};

bumpVersion();