import * as FileSystem from 'expo-file-system';

let StaticServer = null;
let DocumentDirectoryPath = null;
let exists = async () => false;
let mkdir = async () => {};

let didWarnNativeUnavailable = false;

try {
    // eslint-disable-next-line global-require
    StaticServer = require('@dr.pogodin/react-native-static-server').default;
} catch (error) {
    StaticServer = null;
}

try {
    // eslint-disable-next-line global-require
    const RNFS = require('@dr.pogodin/react-native-fs');
    DocumentDirectoryPath = RNFS.DocumentDirectoryPath;
    exists = RNFS.exists;
    mkdir = RNFS.mkdir;
} catch (error) {
    DocumentDirectoryPath = null;
    exists = async () => false;
    mkdir = async () => {};
}

let serverInstance = null;
let serverOrigin = null;
const IMAGES_SUBDIRECTORY = 'images';

const stripFileScheme = (uri) => {
    if (!uri) return uri;
    return uri.startsWith('file://') ? uri.replace('file://', '') : uri;
};

const normalizeOrigin = (origin) => {
    if (!origin) return origin;
    return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};

export const ensureStaticServer = async () => {
    if (!StaticServer || !DocumentDirectoryPath) {
        if (!didWarnNativeUnavailable) {
            console.warn(
                '[StaticServer] Native modules are unavailable. Running in degraded mode (Expo Go?). ' +
                'Local image hosting will fall back to direct file URIs.'
            );
            didWarnNativeUnavailable = true;
        }
        serverInstance = null;
        serverOrigin = null;
        return null;
    }

    if (serverOrigin) {
        return serverOrigin;
    }

    const baseUri = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    const fallbackPath = DocumentDirectoryPath ? `${DocumentDirectoryPath}/` : null;

    let basePath = baseUri ? stripFileScheme(baseUri) : fallbackPath;
    if (!basePath || basePath.length === 0) {
        basePath = fallbackPath || '/tmp/';
    }

    console.log('StaticServer directory info:', {
        documentDirectory: FileSystem.documentDirectory,
        cacheDirectory: FileSystem.cacheDirectory,
        DocumentDirectoryPath,
        basePath,
        fallbackPath,
    });

    if (!basePath) {
        throw new Error('FileSystem document directory is not available.');
    }

    const rootPath = `${basePath.replace(/\/+$/, '')}/${IMAGES_SUBDIRECTORY}`;
    console.log('StaticServer baseUri:', baseUri, 'fallbackPath:', fallbackPath, 'basePath:', basePath, 'rootPath:', rootPath);

    if (!rootPath) {
        throw new Error('Failed to resolve static server root path.');
    }

    const expoDirInfo = baseUri
        ? await FileSystem.getInfoAsync(`${baseUri}${IMAGES_SUBDIRECTORY}/`)
        : null;

    let hasDirectory = expoDirInfo ? expoDirInfo.exists : await exists(rootPath);

    if (!hasDirectory) {
        try {
            if (baseUri) {
                await FileSystem.makeDirectoryAsync(`${baseUri}${IMAGES_SUBDIRECTORY}/`, { intermediates: true });
            }
        } catch (expoError) {
            console.warn('StaticServer expo directory creation failed, fallback to RNFS:', expoError);
        }

        if (!baseUri) {
            await mkdir(rootPath);
        }

        hasDirectory = true;
    }

    serverInstance = new StaticServer({
        port: 0,
        fileDir: rootPath,
    });

    const origin = await serverInstance.start();
    serverOrigin = normalizeOrigin(origin);
    return serverOrigin;
};

const guessMimeType = (uri = '') => {
    const lower = uri.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
};

export const getPublicUrlForFileUri = async (fileUri) => {
    const origin = await ensureStaticServer();
    if (!origin) {
        try {
            const primaryUri = fileUri?.startsWith('file://') ? fileUri : `file://${fileUri}`;
            let base64;
            try {
                base64 = await FileSystem.readAsStringAsync(primaryUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
            } catch (primaryError) {
                const stripped = stripFileScheme(primaryUri);
                base64 = await FileSystem.readAsStringAsync(stripped, {
                    encoding: FileSystem.EncodingType.Base64,
                });
            }
            const mime = guessMimeType(fileUri);
            return `data:${mime};base64,${base64}`;
        } catch (error) {
            console.warn('[StaticServer] Failed to create data URI fallback, returning original URI.', error);
            return fileUri;
        }
    }
    const baseUri = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    const fallbackPath = DocumentDirectoryPath ? `file://${DocumentDirectoryPath}/` : null;

    const imagesDirUri = baseUri
        ? `${baseUri}${IMAGES_SUBDIRECTORY}/`
        : fallbackPath
            ? `${fallbackPath}${IMAGES_SUBDIRECTORY}/`
            : null;

    if (!imagesDirUri) {
        return fileUri;
    }

    if (!fileUri || !fileUri.startsWith(imagesDirUri)) {
        return fileUri;
    }

    const relativePath = fileUri.slice(imagesDirUri.length);
    return `${origin}/${relativePath.replace(/^\//, '')}`;
};

export const stopStaticServer = async () => {
    if (serverInstance) {
        try {
            await serverInstance.stop();
        } catch (error) {
            console.warn('Failed to stop static server:', error);
        }
        serverInstance = null;
        serverOrigin = null;
    }
};
