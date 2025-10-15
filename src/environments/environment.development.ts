const API_URL = 'http://localhost:3000/api';
const API_URL1 = 'http://localhost:5000/api';

export const environment = {
    baseUrl: `${API_URL}`,
    basesvrUrl: `${API_URL1}`,

    collectionDataUrl: `${API_URL}/collection-data`,
    saveSelectedFiltersUrl: `${API_URL}/save-filters`,
    getCollectionFieldsUrl: `${API_URL}/collection-fields`,

    saveTabsUrl: `${API_URL1}/saveOrUpdateTabs`,
    updateTabsUrl: `${API_URL1}/updateTabs`,
    getAllTabsUrl: `${API_URL1}/getTabs`,
    deleteTabsUrl: `${API_URL1}/deleteTabs`,
    
    getDataNamesUrl: `${API_URL1}/getDatanames`,

    uploadExcelUrl: `${API_URL}/upload-excel`,
    listDatabasesUrl: `${API_URL}/list-databases`,
    listCollectionsUrl: `${API_URL}/collections`,
    getCollectionDataUrl: `${API_URL}/mongo-data`,
    updateCollectionUrl: `${API_URL}/update-collection`,
    deleteCollectionUrl: `${API_URL}/delete-collection`,
    getCollectionSchemaUrl: `${API_URL}/schema`,


    joinCollectionsUrl: `${API_URL1}/join`,
    getSchemaUrl: `${API_URL1}/schema`,

    postCollectionNamesUrl: `${API_URL}/post-collections`,
    dbCollectionsUrl: `${API_URL}/dbcollections`,

    getRelationshipsUrl: `${API_URL1}/relationships`,
    deleteRelationshipUrl: `${API_URL1}/relationship`,
    saveRelationshipsUrl: `${API_URL1}/relationships`,

    getFilteredDataUrl: `${API_URL}/collection-tabledata`,
    getFilteredData: `${API_URL}/collection-datas`,

    saveArrayUrl: `${API_URL1}/save-array`,
    getArrayUrl: `${API_URL1}/get-array`,
    updateArrayUrl: `${API_URL1}/update-array`,
    deleteArrayUrl: `${API_URL1}/delete-array`,

    deleteFileurl: `${API_URL1}/delete-file`

};
