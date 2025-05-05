import { Component } from '@angular/core';
import { TodoItemComponent } from '../todo-item/todo-item.component';

@Component({
	selector: 'app-todo-list',
	imports: [TodoItemComponent],
	templateUrl: './todo-list.component.html',
	styleUrl: './todo-list.component.css'
})
export class TodoListComponent {
	
	todos = [{id: 1, title:'TodoList', completed: false}];
	
	// addTodo() {
	// 	this.todos.push(
	// 		{
	// 			id: this.todos.map(())
	// 			title: 'New Todo',
	// 			completed: false
	// 		}
	// 	)
	// }

	removeTodo() {
		this.todos.pop();
	}

	
}

