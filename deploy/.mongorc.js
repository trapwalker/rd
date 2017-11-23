
function rmu(login) {
    db = db.getSiblingDB('rd');
    print('Remove ' + login);
    print('From agent:')
    printjson(db.agent.remove({login: login}));
    print('From user:')
    printjson(db.user.remove({name: login}));
};


function lookup(anyid) {
    db = db.getSiblingDB('rd');
    print('Lookup by ' + anyid);

    var u = db.user.find({$or: [
            {"auth.steam.social_id": anyid},
            {"auth.standard.email": anyid},
            {"name": anyid}
        ]});

    var res = {
        users: u.toArray()
    };

    //print("User found: " + u.count());
    //printjson(res.users);

    res.users.forEach(
        function(user, i, arr) {
            print("### USER[" + i + "]: ##########################################");
            printjson(user);
            user.agents = db.agent.find({login: user.name}).toArray();
            user.agents.forEach(function(a, j, ags){
           print("=== AGENT[" + j + "] ==================================================");
           printjson(a);
            });
        }
    );

    return res;
};
