const vscode = require("vscode");
const azdata = require("azdata");

exports.activate = function(context) {
    let disposable = vscode.commands.registerCommand("deletedb.delete", function(context) {
        let dbName = context.nodeInfo.metadata.name;

        vscode.window.showWarningMessage(`Delete database "${dbName}"?`, "Yes", "No").then(value => {
            if (value === "Yes") {
                dropDatabase(context.connectionProfile, dbName).then(() => {
                    refreshDatabases(context.connectionProfile.id, context.nodeInfo.nodePath);
                });
            }
        });
    });

    context.subscriptions.push(disposable);
};

function refreshDatabases(connectionId, nodePath) {
    azdata.objectexplorer.getNode(connectionId, nodePath).then(x => {
        x.getParent().then(parent => {
            parent.refresh();
        });
    });
}

function dropDatabase(connectionProfile, dbName) {
    return new Promise((resolve, reject) => {
        azdata.connection.connect(connectionProfile, false, false).then(connectionResult => {
            azdata.connection.getUriForConnection(connectionResult.connectionId).then(connectionUri => {
                let queryProvider = azdata.dataprotocol.getProvider("MSSQL", azdata.DataProviderType.QueryProvider);
    
                queryProvider.runQueryAndReturn(connectionUri, `ALTER DATABASE "${dbName}" SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE "${dbName}"`)
                .catch(error => {
                    //error with code 0 is thrown when query has nothing to return
                    let connectionProvider = azdata.dataprotocol.getProvider("MSSQL", azdata.DataProviderType.ConnectionProvider);
                    connectionProvider.disconnect(connectionUri);
                    
                    if (error.code === 0) {
                        resolve();
                    }
                    else{
                        vscode.window.showErrorMessage("Something has gone wrong");
                        console.log(error);
                        reject();
                    }
                });
            });
        });
    });
}

exports.deactivate = function() {};
