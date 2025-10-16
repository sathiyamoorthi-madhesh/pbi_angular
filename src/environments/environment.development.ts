const API_URL = 'http://localhost:3000/api';
// const API_URL1 = 'http://localhost:3000/api';

export const environment = {
    baseUrl: `${API_URL}`,
    // basesvrUrl: `${API_URL1}`,

    getCollectionFieldsUrl: `${API_URL}/collection-fields`,

    TabsUrl: `${API_URL}/tabs`,

    getDatanamesUrl: `${API_URL}/datanames`,

    // Relationship routes
    postCollectionNamesUrl: `${API_URL}/post-collections`,
    getcollectionNameUrl: `${API_URL}/dbcollections`,
    RelationshipsUrl: `${API_URL}/relationships`,

    getFilteredDataUrl: `${API_URL}/collection-datas`,

    // Workspace routes
    workspaceUrl: `${API_URL}/workspaces`,
    workspaceFilesUrl: `${API_URL}/workspaces/files`,

};