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
        azdata.connection.getActiveConnections().then(x => {
            console.log(x);
        });

        azdata.connection.connect(connectionProfile, false, false).then(x => {
            azdata.connection.getUriForConnection(x.connectionId).then(connectionUri => {
                let queryProvider = azdata.dataprotocol.getProvider("MSSQL", azdata.DataProviderType.QueryProvider);
                
                queryProvider.registerOnQueryComplete(result => {
                    let connectionProvider = azdata.dataprotocol.getProvider("MSSQL", azdata.DataProviderType.ConnectionProvider);
                    connectionProvider.disconnect(connectionUri);
                    if (!result.batchSummaries[0].hasError) {
                        resolve();
                    }
                    else{
                        vscode.window.showErrorMessage("Something has gone wrong");
                        reject();
                    }
                });
    
                queryProvider.runQueryString(connectionUri, `DROP DATABASE "${dbName}"`).catch(error => {
                    vscode.window.showErrorMessage("Could not drop database :(");
                    reject();
                    console.log(error);
                });
            });
        });
    });
}

exports.deactivate = function() {};
