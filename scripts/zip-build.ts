import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import JSZip from 'jszip';
import { getWorkspaceRoot } from '@lumegem/shared/node/paths';

async function addDirectoryToZip(zip: JSZip, dirPath: string, rootDirPath: string) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(rootDirPath, fullPath);

        if (entry.isDirectory()) {
            await addDirectoryToZip(zip, fullPath, rootDirPath);
        } else {
            const fileData = await fs.readFile(fullPath);
            zip.file(relativePath, fileData);
        }
    }
}

async function run() {
    console.log('📦 Starting Static Site ZIP packaging...');

    try {
        const workspaceRoot = getWorkspaceRoot();
        
        const arg1 = process.argv[2];
        const arg2 = process.argv[3];

        let projectId = process.env.PROJECT_ID || 'default';
        let outputPathArg: string | undefined = undefined;

        if (arg1) {
            // Check if arg1 looks like a path (e.g. contains slashes or ends with .zip)
            if (arg1.includes('/') || arg1.includes('\\') || arg1.endsWith('.zip')) {
                outputPathArg = arg1;
            } else {
                projectId = arg1;
                outputPathArg = arg2;
            }
        }

        const siteDir = projectId === 'default'
            ? path.join(workspaceRoot, 'apps/site')
            : path.join(workspaceRoot, 'projects/sites', projectId);
        const distDir = path.join(siteDir, 'dist');

        // 1. Run static build first
        console.log(`🏗️ Building static site first for project: ${projectId}...`);
        execSync(`npm run build:static-site -- ${projectId}`, {
            cwd: workspaceRoot,
            stdio: 'inherit',
            env: {
                ...process.env,
                PROJECT_ID: projectId
            }
        });

        // 2. Double-check dist directory exists
        try {
            await fs.access(distDir);
        } catch {
            throw new Error(`Build directory does not exist at: ${distDir}`);
        }

        // 3. Determine output path
        let outputPath: string;

        if (outputPathArg) {
            outputPath = path.isAbsolute(outputPathArg) 
                ? outputPathArg 
                : path.resolve(process.cwd(), outputPathArg);
        } else {
            outputPath = projectId === 'default'
                ? path.join(workspaceRoot, 'site-build.zip')
                : path.join(workspaceRoot, `site-build-${projectId}.zip`);
        }

        // Ensure parent directory of output exists
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });

        console.log(`🤐 Zipping files from ${distDir}...`);

        const zip = new JSZip();
        await addDirectoryToZip(zip, distDir, distDir);

        console.log('💾 Writing ZIP archive...');
        const content = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 9
            }
        });

        await fs.writeFile(outputPath, content);

        const stats = await fs.stat(outputPath);
        const sizeInMb = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`\n✨ ZIP packaging complete!`);
        console.log(`📂 Output file: ${outputPath}`);
        console.log(`⚖️ Size: ${sizeInMb} MB\n`);

    } catch (error) {
        console.error('❌ ZIP packaging failed:', error);
        process.exit(1);
    }
}

run();
