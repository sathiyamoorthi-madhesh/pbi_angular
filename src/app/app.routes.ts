import { Routes } from '@angular/router';
import { WorkspaceComponent } from './components/workspace/workspace.component';
import { RelationshipsComponent } from './components/relationships/relationships.component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/workspace',
        pathMatch: 'full'
    },
    {
        path: 'workspace',
        component: WorkspaceComponent
    },
    {
        path: 'relationship',
        component: RelationshipsComponent
    }
];
