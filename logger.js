function logger(req, res, next) {
    console.log("Logger Middleware Triggered!"); // Debugging line
    
    // Log the request method and URL
        console.log("---------------------------");
        console.log("New request received:");
        console.log("Timestamp:", timestamp);
        console.log("Method:", req.method);
        console.log("URL:", req.url);
        console.log("Status Code:", res.statusCode);
        console.log("---------------------------");


    

    next(); 
}

module.exports = logger;
