import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WorkspaceComponent } from "./components/workspace/workspace.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'angular';
}
