import { Component, Input } from '@angular/core';

export interface TodoItem {
	title: string;
	completed: boolean;
}


@Component({
	selector: 'app-todo-item',
	imports: [],
	templateUrl: './todo-item.component.html',
	styleUrl: './todo-item.component.css'
})
export class TodoItemComponent {
	
	@Input() todoItem!: TodoItem;

	completeTodo(todoItem: TodoItem, completed: boolean) {
		todoItem.completed = completed;
	}
}
