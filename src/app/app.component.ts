import { Component } from '@angular/core';
import { RouterOutlet, RouterModule, NavigationEnd, Router } from '@angular/router';
import { WorkspaceComponent } from "./components/workspace/workspace.component";
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { ToasterComponent } from "./components/ui-components/toaster/toaster.component"; 

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule, CommonModule, ToasterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  sidebarCollapsed = false;
  isCanvasScreen = false;

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.isCanvasScreen = event.url.includes('/canvas');
      });
  }

  toggleSidebar() {
    if (this.isCanvasScreen) {
      return;
    }
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
}
