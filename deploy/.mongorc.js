
function rmu(login) {
    db = db.getSiblingDB('rd');
    print('Remove ' + login);
    print('From agent:')
    printjson(db.agent.remove({login: login}));
    print('From user:')
    printjson(db.user.remove({name: login}));
};