console.log("Sandbox: SANDBOX JS FILE LOADED");

// Set up message event handler:
window.addEventListener('message', event => {
    console.log("Sandbox: Received a message. Event data: ");
    console.log(event.data);

    const command = event.data.command;
    const name = event.data.name || 'hello';

    switch(command) {
        case 'test':
            console.log("Sandbox: Received a message with command: " + event.data.command);
            console.log("Sandbox: Returning message to sender.");
            event.source.postMessage({
                    name: name
                    //html: templates[name](event.data.context)
                }, 
                event.origin
            );
            break;
        default:
            console.log("Sandbox: Received a message that couldn't be handled. Message command: " + event.data.command);
      // You could imagine additional functionality. For instance:
      //
      // case 'new':
      //   templates[event.data.name] = Handlebars.compile(event.data.source);
      //   event.source.postMessage({name: name, success: true}, event.origin);
      //   break;
    }
});