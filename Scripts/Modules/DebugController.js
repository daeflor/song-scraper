function logWarning(logString) {
    console.warn(logString);
}

function logError(logString) {
    console.error(logString);
    console.trace();
}

export { logWarning, logError };