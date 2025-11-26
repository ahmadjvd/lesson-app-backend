function logger(req, res, next) {
    console.log("Logger Middleware Triggered!"); // Debugging line
    
    // Log the request method and URL
    console.log("---------------------------");
    console.log("New request received:");
    console.log("Method:", req.method);
    console.log("URL:", req.url);


    

    next(); 
}

module.exports = logger;
