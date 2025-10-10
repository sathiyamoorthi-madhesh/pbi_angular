import { Routes } from '@angular/router';
import { WorkspaceComponent } from './components/workspace/workspace.component';
import { RelationshipsComponent } from './components/relationships/relationships.component';
import { CanvasComponent } from './components/canvas/canvas.component';

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
    },
    {
        path: 'canvas',
        component: CanvasComponent
    }
];
