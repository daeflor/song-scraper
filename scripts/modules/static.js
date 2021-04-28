console.log("Static module getting initialized");

export const supportedApps = Object.freeze({ 
    youTubeMusic: 'ytm',
    googlePlayMusic: 'gpm'
});

export function getMyVar() {
    return 'cake is nice';
}

//console.log(myGlobalVar);