const vscode = require("vscode");
const azdata = require("azdata");

let counter = 1;

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
    return new Promise(resolve => {
        let connectionProvider = azdata.dataprotocol.getProvider("MSSQL", azdata.DataProviderType.ConnectionProvider);
        let connectionUri = `untitled:deletedb${counter++}`;

        connectionProvider.registerOnConnectionComplete(() => {
            let queryProvider = azdata.dataprotocol.getProvider(
                connectionProvider.providerId,
                azdata.DataProviderType.QueryProvider
            );

            queryProvider.registerOnQueryComplete(result => {
                connectionProvider.disconnect();
                if (!result.batchSummaries[0].hasError) {
                    resolve();
                }
                else{
                    vscode.window.showErrorMessage("Could not drop database :(");
                }
            });

            queryProvider.runQueryString(connectionUri, `DROP DATABASE "${dbName}"`).catch(error => {
                vscode.window.showErrorMessage("Could not drop database :(");
                console.log(error);
            });
        });

        connectionProvider.connect(connectionUri, connectionProfile).catch(error => {
            vscode.window.showErrorMessage("Could not connect do database :(");
            console.log(error);
        });
    });
}

exports.deactivate = function() {};
